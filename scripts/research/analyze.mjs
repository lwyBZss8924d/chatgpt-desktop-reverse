import { parse } from 'acorn';
import { simple } from 'acorn-walk';
import { posix } from 'node:path';

export function propertyName(node) {
  if (!node) return '';
  if (node.type === 'ChainExpression') return propertyName(node.expression);
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'MemberExpression')
    return node.computed ? String(node.property.value ?? '') : node.property.name;
  return '';
}

export function stringValue(node, source = '') {
  if (!node) return null;
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node.type === 'TemplateLiteral') {
    return node.quasis
      .map(
        (q, i) =>
          (q.value.cooked ?? q.value.raw) +
          (node.expressions[i]
            ? '{' +
              source.slice(node.expressions[i].start, node.expressions[i].end).slice(0, 100) +
              '}'
            : '')
      )
      .join('');
  }
  return null;
}

export function resolveImport(file, target) {
  if (!target.startsWith('.')) return `external:${target}`;
  return posix.normalize(posix.join(posix.dirname(file), target.split('?')[0]));
}
export function resolveFileReference(reference, files, packageMains = new Map()) {
  const target = reference.target.startsWith('external:')
    ? reference.target
    : reference.target.replace(/\/+$/, '');
  if (target.startsWith('external:')) return { ...reference, resolution: 'external' };
  if (files.has(target)) return { ...reference, resolution: 'exact' };
  const candidates = [
    target + '.js',
    target + '.json',
    target + '.node',
    packageMains.get(target),
    target + '/index.js',
    target + '/index.json',
    target + '/index.node',
  ].filter(Boolean);
  const found = candidates.find((p) => files.has(p));
  return found
    ? {
        ...reference,
        originalTarget: target,
        target: found,
        resolution: reference.kind === 'require' ? 'commonjs' : 'filename-candidate',
      }
    : { ...reference, resolution: 'unresolved' };
}

/** Parse only; shipped code is never evaluated. Dynamic values stay unresolved. */
export function analyzeJavaScript(
  source,
  file,
  { methods = new Set(), channels = new Set(), services = new Set() } = {}
) {
  const result = { imports: [], literals: [], calls: [], ipc: [], flags: [], parseError: null };
  let ast;
  try {
    ast = parse(source, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      locations: true,
      allowReturnOutsideFunction: true,
      allowHashBang: true,
    });
  } catch (error) {
    result.parseError = `${error.name}: ${error.message}`;
    return result;
  }
  const addImport = (node, dynamic, kind = 'import') => {
    const target = stringValue(node, source);
    if (target && !target.includes('{'))
      result.imports.push({
        target: resolveImport(file, target),
        dynamic,
        line: node.loc.start.line,
        kind,
        specifier: target,
      });
  };
  const addLiteral = (node) => {
    const value = stringValue(node, source);
    if (methods.has(value) || channels.has(value))
      result.literals.push({ value, start: node.start, end: node.end });
  };
  simple(ast, {
    ImportDeclaration(node) {
      addImport(node.source, false);
    },
    ExportNamedDeclaration(node) {
      if (node.source) addImport(node.source, false);
    },
    ExportAllDeclaration(node) {
      addImport(node.source, false);
    },
    ImportExpression(node) {
      addImport(node.source, true);
    },
    Literal: addLiteral,
    TemplateLiteral: addLiteral,
    CallExpression(node) {
      const name = propertyName(node.callee);
      const first = stringValue(node.arguments[0], source);
      if (name === 'require') addImport(node.arguments[0], false, 'require');
      if (first && channels.has(first))
        result.ipc.push({ channel: first, operation: name, start: node.start, end: node.end });
      if (first && /^(?:getGate|checkGate|useGateValue|isGateEnabled|checkFeatureGate)$/.test(name))
        result.flags.push({ marker: first, start: node.start, end: node.end });
      const verb = name.replace(/^safe/, '').toUpperCase();
      const isVerb = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(verb);
      const isFetch = name === 'fetch';
      if (!first || (!isVerb && !isFetch)) return;
      const path = first
        .replace(/^https?:\/\/[^/]+/, '')
        .replace(/^\/(?:backend-api|__codex-api)/, '');
      const service = path.split('/')[1];
      if (
        !path.startsWith('/') ||
        (!services.has(service) &&
          !first.includes('/backend-api/') &&
          !first.includes('/__codex-api/'))
      )
        return;
      let method = isVerb ? verb : 'GET';
      if (isFetch && node.arguments[1]?.type === 'ObjectExpression') {
        const entry = node.arguments[1].properties.find(
          (p) => (p.key?.name ?? p.key?.value) === 'method'
        );
        if (entry) method = stringValue(entry.value, source)?.toUpperCase() ?? 'DYNAMIC';
      }
      const args = node.arguments.slice(1).map((a) => source.slice(a.start, a.end).slice(0, 900));
      result.calls.push({
        path,
        service,
        verb: method,
        args,
        start: node.start,
        end: node.end,
        callee: source.slice(node.callee.start, node.callee.end),
      });
    },
  });
  result.imports = [
    ...new Map(result.imports.map((i) => [`${i.target}:${i.dynamic}`, i])).values(),
  ];
  return result;
}

export function fieldType(field) {
  if (field.$ref) return field.$ref.split('/').at(-1);
  if (field.enum) return field.enum.map((x) => JSON.stringify(x)).join(' | ');
  if (field.anyOf || field.oneOf) return (field.anyOf ?? field.oneOf).map(fieldType).join(' | ');
  if (field.type === 'array') return `Array<${fieldType(field.items ?? {})}>`;
  if (field.type === 'object' && field.additionalProperties)
    return `Record<string, ${typeof field.additionalProperties === 'object' ? fieldType(field.additionalProperties) : 'unknown'}>`;
  return Array.isArray(field.type) ? field.type.join(' | ') : (field.type ?? 'unknown');
}

export function fieldsOf(definition) {
  return Object.entries(definition?.properties ?? {}).map(([name, field]) => ({
    name,
    type: fieldType(field),
    required: (definition.required ?? []).includes(name),
    description: field.description ?? '',
  }));
}

export function validateModel(model) {
  const errors = [];
  if (model.schemaVersion !== 1) errors.push('unsupported schema version');
  if (!/^[a-f0-9]{40}$/.test(model.provenance.coreRevision))
    errors.push('core revision must be a full SHA');
  const nodeIds = new Set([
    ...model.nodes.map((n) => n.id),
    ...model.bundle.modules.map((n) => n.id),
  ]);
  if (new Set(model.nodes.map((n) => n.id)).size !== model.nodes.length)
    errors.push('duplicate node IDs');
  const sourceIds = new Set(model.sources.map((s) => s.id));
  if (sourceIds.size !== model.sources.length) errors.push('duplicate source IDs');
  for (const n of model.nodes)
    for (const id of n.sourceIds)
      if (!sourceIds.has(id)) errors.push(`${n.id}: missing source ${id}`);
  for (const e of model.relations) {
    if (!nodeIds.has(e.from) || !nodeIds.has(e.to)) errors.push(`dangling relation ${e.id}`);
    for (const id of e.evidenceIds)
      if (!sourceIds.has(id)) errors.push(`relation ${e.id}: missing source ${id}`);
    if (!e.inference && !e.evidenceIds.length)
      errors.push(`unsubstantiated direct relation ${e.id}`);
  }
  for (const s of model.sources) {
    if (
      s.path.startsWith('codex-rs/') &&
      !s.href?.includes(`/blob/${model.provenance.coreRevision}/`)
    )
      errors.push(`unpinned source ${s.id}`);
    if (s.lineStart && s.lineEnd < s.lineStart) errors.push(`invalid source range ${s.id}`);
  }
  if (model.methods.length !== model.baseline.methods)
    errors.push('baseline method inventory changed');
  if (model.commands.length !== model.baseline.commandKeys)
    errors.push('baseline command inventory changed');
  if (model.captures.length !== model.baseline.captures) errors.push('capture inventory changed');
  if (model.ipc.length !== model.baseline.ipc) errors.push('baseline IPC inventory changed');
  return errors;
}

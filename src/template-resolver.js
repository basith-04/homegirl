'use strict';
function getValue(context, dottedPath) { return dottedPath.split('.').reduce((value, key) => value && Object.prototype.hasOwnProperty.call(value, key) ? value[key] : undefined, context); }
function validate(template, context) { const unknown = []; String(template).replace(/{{\s*([\w.]+)\s*}}/g, (_, key) => { if (getValue(context, key) === undefined) unknown.push(key); return ''; }); return unknown; }
function resolve(template, context) { const unknown = validate(template, context); if (unknown.length) return { ok: false, text: '', unknown }; return { ok: true, text: String(template).replace(/{{\s*([\w.]+)\s*}}/g, (_, key) => String(getValue(context, key))), unknown: [] }; }
module.exports = { resolve, validate };

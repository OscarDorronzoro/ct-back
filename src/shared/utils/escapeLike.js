// Escapes LIKE wildcards so user input matches literally
export default function escapeLike(value) {
  return value.replace(/[\\%_]/g, '\\$&');
}

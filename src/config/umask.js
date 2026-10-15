// New files 640, directories 750: no access for other users.
// Imported first in bootstrap.js, before any module creates files (logger).
process.umask(0o027);

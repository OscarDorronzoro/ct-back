// fn(item) for each item, one after the other: for when the order matters (each step depends on
// the previous ones), or for the queries of a transaction (one connection: one query at a time).
// Returns the results, in order.
export default function runInOrder(items, fn) {
  return items.reduce(
    (chain, item) => chain.then(async (results) => [...results, await fn(item)]),
    Promise.resolve([]),
  );
}

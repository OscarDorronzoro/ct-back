// fn(item) for each item, one after the other: for when the order matters (each step depends on
// the previous ones)
export default function runInOrder(items, fn) {
  return items.reduce((chain, item) => chain.then(() => fn(item)), Promise.resolve());
}

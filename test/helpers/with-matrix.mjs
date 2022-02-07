export async function withMatrix (matrix, cb) {
  for (
    const entries of cross(
      Object
        .entries(matrix)
        .map(([k, vs]) => vs.map((v) => [k, v]))
    )
  ) {
    await cb(Object.fromEntries(entries))
  }
}

function cross (arrays) {
  return arrays.reduce((as, bs) => as.flatMap((a) => bs.map((b) => [...a, b])), [[]])
}

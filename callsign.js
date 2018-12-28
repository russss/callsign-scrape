function *callsignSuffixes() {
  for (var i of Array(26).keys()) {
    for (var j of Array(26).keys()) {
      for (var k of Array(26).keys()) {
        yield (
          Number(i + 10).toString(36) +
          Number(j + 10).toString(36) +
          Number(k + 10).toString(36)
        ).toUpperCase();
      }
    }
  }
}

exports.suffixes = callsignSuffixes;

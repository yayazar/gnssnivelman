// Basit matris işlemleri (dış kütüphane bağımlılığı olmadan)

function matZeros(rows, cols) {
  return Array.from({ length: rows }, () => new Array(cols).fill(0));
}

function matTranspose(A) {
  const rows = A.length, cols = A[0].length;
  const T = matZeros(cols, rows);
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) T[j][i] = A[i][j];
  }
  return T;
}

function matMultiply(A, B) {
  const rA = A.length, cA = A[0].length, cB = B[0].length;
  const C = matZeros(rA, cB);
  for (let i = 0; i < rA; i++) {
    for (let k = 0; k < cA; k++) {
      const aik = A[i][k];
      if (aik === 0) continue;
      for (let j = 0; j < cB; j++) {
        C[i][j] += aik * B[k][j];
      }
    }
  }
  return C;
}

// Köşegen ağırlık matrisi ile A^T * P * A ve A^T * P * l hesapları
function weightedNormalEquations(A, weights, l) {
  const n = A.length, u = A[0].length;
  const N = matZeros(u, u);
  const n_ = matZeros(u, 1);
  for (let k = 0; k < n; k++) {
    const w = weights[k];
    if (w === 0) continue;
    for (let i = 0; i < u; i++) {
      const aik = A[k][i];
      if (aik === 0) continue;
      n_[i][0] += w * aik * l[k][0];
      for (let j = 0; j < u; j++) {
        const akj = A[k][j];
        if (akj === 0) continue;
        N[i][j] += w * aik * akj;
      }
    }
  }
  return { N, n: n_ };
}

// Gauss-Jordan eliminasyonu ile kare matris tersi (kısmi pivotlama ile)
function matInverse(A) {
  const n = A.length;
  const M = A.map((row, i) => {
    const identityRow = new Array(n).fill(0);
    identityRow[i] = 1;
    return [...row, ...identityRow];
  });

  for (let col = 0; col < n; col++) {
    // Pivot seç
    let pivotRow = col;
    let maxAbs = Math.abs(M[col][col]);
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > maxAbs) {
        maxAbs = Math.abs(M[r][col]);
        pivotRow = r;
      }
    }
    if (maxAbs < 1e-12) {
      throw new Error("Normal denklem matrisi tekil (singular): sistem çözülemiyor. Ağın yeterince ölçüldüğünden emin olun.");
    }
    if (pivotRow !== col) {
      [M[col], M[pivotRow]] = [M[pivotRow], M[col]];
    }
    const pivotVal = M[col][col];
    for (let j = 0; j < 2 * n; j++) M[col][j] /= pivotVal;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = M[r][col];
      if (factor === 0) continue;
      for (let j = 0; j < 2 * n; j++) {
        M[r][j] -= factor * M[col][j];
      }
    }
  }

  return M.map((row) => row.slice(n));
}




import argon from "argon2";


export async function hashPassword(password: string) {
  return argon.hash(password, {
    type: argon.argon2id,
    memoryCost: 2 ** 16, // 64 MB
    timeCost: 3,
    parallelism: 1,
  });
}

export async function verifyPassword(hash: string, password: string) {
 
  return argon.verify(hash, password);
  
}
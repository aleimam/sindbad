import { Injectable } from '@nestjs/common';
import { hash, verify, Algorithm } from '@node-rs/argon2';

const ARGON2ID = { algorithm: Algorithm.Argon2id };

@Injectable()
export class PasswordService {
  hash(plain: string): Promise<string> {
    return hash(plain, ARGON2ID);
  }

  verify(hashed: string, plain: string): Promise<boolean> {
    return verify(hashed, plain, ARGON2ID).catch(() => false);
  }
}

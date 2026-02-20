import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = 'collab-editor-secret-key';

interface User {
  id: string;
  username: string;
  passwordHash: string;
  colour: string;
}

const users: Record<string, User> = {};

const COLOURS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];

export const register = async (username: string, password: string): Promise<{ token: string; username: string; colour: string } | null> => {
  if (users[username]) return null;

  const passwordHash = await bcrypt.hash(password, 10);
  const colour = COLOURS[Object.keys(users).length % COLOURS.length];
  const id = Math.random().toString(36).substring(2, 9);

  users[username] = { id, username, passwordHash, colour };

  const token = jwt.sign({ id, username, colour }, JWT_SECRET, { expiresIn: '24h' });
  return { token, username, colour };
};

export const login = async (username: string, password: string): Promise<{ token: string; username: string; colour: string } | null> => {
  const user = users[username];
  if (!user) return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  const token = jwt.sign({ id: user.id, username, colour: user.colour }, JWT_SECRET, { expiresIn: '24h' });
  return { token, username, colour: user.colour };
};

export const verifyToken = (token: string): { id: string; username: string; colour: string } | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: string; username: string; colour: string };
  } catch {
    return null;
  }
};
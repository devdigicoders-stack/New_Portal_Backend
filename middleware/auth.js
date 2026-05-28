import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'newsportal_super_secret_key';

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token format.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized: Token is expired or invalid.' });
  }
}

export function authorize(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden: Access restricted. Requires role in [${allowedRoles.join(', ')}]` });
    }

    next();
  };
}

import bcrypt from 'bcryptjs';
import { createPublicKey, randomBytes, timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import User from '../models/User.js';

const registrationSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128)
});
const loginSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128)
});
const googleKeysCache = { keys: null, expiresAt: 0 };

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured.');
  }
  return process.env.JWT_SECRET;
};

const setSessionCookie = (res, user) => {
  const token = jwt.sign(
    { sub: user.id, role: user.role },
    getJwtSecret(),
    { expiresIn: '7d' }
  );

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/'
  });
};

const getGoogleConfiguration = () => {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_CALLBACK_URL) {
    return null;
  }

  return {
    clientId: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackUrl: GOOGLE_CALLBACK_URL
  };
};

const googleOAuthStateCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 10 * 60 * 1000,
  path: '/api/auth/google'
};

const safeStateMatch = (providedState, storedState) => {
  if (typeof providedState !== 'string' || typeof storedState !== 'string') {
    return false;
  }

  const provided = Buffer.from(providedState);
  const stored = Buffer.from(storedState);
  return provided.length === stored.length && timingSafeEqual(provided, stored);
};

const getGoogleSigningKey = async (keyId) => {
  if (!googleKeysCache.keys || Date.now() >= googleKeysCache.expiresAt) {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/certs');
    if (!response.ok) {
      throw new Error('Unable to retrieve Google signing keys.');
    }

    const { keys } = await response.json();
    const cacheControl = response.headers.get('cache-control') || '';
    const maxAge = Number(cacheControl.match(/max-age=(\d+)/)?.[1]) || 300;
    googleKeysCache.keys = keys;
    googleKeysCache.expiresAt = Date.now() + maxAge * 1000;
  }

  const jwk = googleKeysCache.keys.find((key) => key.kid === keyId && key.alg === 'RS256');
  if (!jwk) {
    googleKeysCache.expiresAt = 0;
    throw new Error('Google ID token signing key was not found.');
  }

  return createPublicKey({ key: jwk, format: 'jwk' });
};

const verifyGoogleIdToken = async (idToken, clientId) => {
  const decoded = jwt.decode(idToken, { complete: true });
  if (!decoded || decoded.header?.alg !== 'RS256' || !decoded.header?.kid) {
    throw new Error('Google returned an invalid identity token.');
  }

  const key = await getGoogleSigningKey(decoded.header.kid);
  const claims = jwt.verify(idToken, key, {
    algorithms: ['RS256'],
    audience: clientId,
    issuer: ['accounts.google.com', 'https://accounts.google.com']
  });

  if (
    typeof claims === 'string' ||
    !claims.sub ||
    !claims.email ||
    claims.email_verified !== true
  ) {
    throw new Error('Google account email is not verified.');
  }

  return claims;
};

const redirectToAuthError = (res) => {
  const clientUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
  const redirectUrl = new URL('/login', clientUrl);
  redirectUrl.searchParams.set('authError', 'google');
  return res.redirect(redirectUrl.toString());
};

export const registerUser = async (req, res, next) => {
  const parsed = registrationSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ message: 'Enter a valid name, email, and password of at least 8 characters.' });
  }

  try {
    const { name, email, password } = parsed.data;
    const existingUser = await User.findOne({ email }).lean();

    if (existingUser) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, password: passwordHash });

    return res.status(201).json({
      success: true,
      message: 'Your account has been created. You can now sign in.',
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    return next(error);
  }
};

export const loginUser = async (req, res, next) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Enter a valid email address and password.' });
  }

  try {
    const { email, password } = parsed.data;
    const user = await User.findOne({ email }).select('+password');
    const passwordMatch = user?.password
      ? await bcrypt.compare(password, user.password)
      : false;

    if (!user || !passwordMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    setSessionCookie(res, user);
    return res.json({
      success: true,
      message: 'Signed in successfully.',
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    return next(error);
  }
};

export const getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.sub).lean();
    if (!user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    return res.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    return next(error);
  }
};

export const logoutUser = (_req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });
  return res.json({ success: true, message: 'Signed out successfully.' });
};

export const startGoogleLogin = (req, res) => {
  const google = getGoogleConfiguration();
  if (!google) {
    return redirectToAuthError(res);
  }

  const state = randomBytes(32).toString('hex');
  const authorizationUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authorizationUrl.search = new URLSearchParams({
    client_id: google.clientId,
    redirect_uri: google.callbackUrl,
    response_type: 'code',
    scope: 'openid email profile',
    state
  }).toString();

  res.cookie('google_oauth_state', state, googleOAuthStateCookieOptions);
  return res.redirect(authorizationUrl.toString());
};

export const completeGoogleLogin = async (req, res, next) => {
  const google = getGoogleConfiguration();
  const { code, state, error: googleError } = req.query;
  const storedState = req.cookies.google_oauth_state;
  res.clearCookie('google_oauth_state', {
    ...googleOAuthStateCookieOptions,
    maxAge: undefined
  });

  if (!google || googleError || !code || !safeStateMatch(state, storedState)) {
    return redirectToAuthError(res);
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: google.clientId,
        client_secret: google.clientSecret,
        redirect_uri: google.callbackUrl,
        grant_type: 'authorization_code'
      })
    });

    if (!tokenResponse.ok) {
      throw new Error('Google authorization code exchange failed.');
    }

    const tokenData = await tokenResponse.json();
    if (typeof tokenData.id_token !== 'string') {
      throw new Error('Google did not return an identity token.');
    }

    const claims = await verifyGoogleIdToken(tokenData.id_token, google.clientId);
    const email = claims.email.toLowerCase();
    let user = await User.findOne({ googleId: claims.sub });

    if (!user) {
      user = await User.findOne({ email }).select('+googleId');

      if (user && user.googleId && user.googleId !== claims.sub) {
        return redirectToAuthError(res);
      }

      if (user) {
        user.googleId = claims.sub;
        user.isEmailVerified = true;
        await user.save();
      } else {
        user = await User.create({
          name: typeof claims.name === 'string' ? claims.name.slice(0, 80) : email,
          email,
          googleId: claims.sub,
          isEmailVerified: true
        });
      }
    }

    const googleName = typeof claims.name === 'string' ? claims.name.trim().slice(0, 80) : '';
    if (googleName && user.name !== googleName) {
      user.name = googleName;
      await user.save();
    }

    setSessionCookie(res, user);
    const clientUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
    const destination = user.role === 'admin' ? '/admin' : '/user';
    return res.redirect(new URL(destination, clientUrl).toString());
  } catch (error) {
    console.error('Google sign-in failed:', error.message);
    return next(error);
  }
};

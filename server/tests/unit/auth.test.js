const { generateToken, verifyToken, authenticate } = require('../../src/utils/auth');
const User = require('../../src/models/User');
const jwt = require('jsonwebtoken');

describe('Auth Utils', () => {
  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        username: 'testuser',
        email: 'test@example.com',
        role: 'user',
      };

      const token = generateToken(mockUser);

      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts separated by dots
    });

    it('should include correct payload in token', () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        username: 'testuser',
        email: 'test@example.com',
        role: 'admin',
      };

      const token = generateToken(mockUser);
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret-key');

      expect(decoded.userId).toBe(mockUser._id);
      expect(decoded.username).toBe(mockUser.username);
      expect(decoded.email).toBe(mockUser.email);
      expect(decoded.role).toBe(mockUser.role);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        username: 'testuser',
        email: 'test@example.com',
        role: 'user',
      };

      const token = generateToken(mockUser);
      const decoded = verifyToken(token);

      expect(decoded.userId).toBe(mockUser._id);
      expect(decoded.username).toBe(mockUser.username);
    });

    it('should throw error for invalid token', () => {
      expect(() => {
        verifyToken('invalid-token');
      }).toThrow('Invalid token');
    });

    it('should throw error for expired token', () => {
      // Create a token that expires immediately
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        username: 'testuser',
      };

      const token = jwt.sign(
        { userId: mockUser._id, username: mockUser.username },
        process.env.JWT_SECRET || 'test-secret-key',
        { expiresIn: '-1s' } // Already expired
      );

      expect(() => {
        verifyToken(token);
      }).toThrow('Invalid token');
    });
  });

  describe('authenticate middleware', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
      mockReq = {
        header: jest.fn(),
      };
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      mockNext = jest.fn();
    });

    it('should return 401 if no token provided', async () => {
      mockReq.header.mockReturnValue(undefined);

      await authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Access denied. No token provided.',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid token', async () => {
      mockReq.header.mockReturnValue('Bearer invalid-token');

      await authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Invalid token.',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next for valid token and active user', async () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        username: 'testuser',
        email: 'test@example.com',
        role: 'user',
        isActive: true,
      };

      const token = generateToken(mockUser);
      mockReq.header.mockReturnValue(`Bearer ${token}`);

      // Mock User.findById
      User.findById = jest.fn().mockResolvedValue(mockUser);

      await authenticate(mockReq, mockRes, mockNext);

      expect(mockReq.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 401 for deactivated user', async () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        username: 'testuser',
        isActive: false,
      };

      const token = generateToken(mockUser);
      mockReq.header.mockReturnValue(`Bearer ${token}`);

      User.findById = jest.fn().mockResolvedValue(mockUser);

      await authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Invalid token or user deactivated.',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});

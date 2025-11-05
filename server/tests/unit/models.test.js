const mongoose = require('mongoose');
const User = require('../../src/models/User');
const Post = require('../../src/models/Post');

describe('Models', () => {
  describe('User Model', () => {
    it('should create a user with valid data', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      };

      const user = new User(userData);
      await user.save();

      expect(user.username).toBe(userData.username);
      expect(user.email).toBe(userData.email);
      expect(user.role).toBe('user'); // default role
      expect(user.isActive).toBe(true); // default isActive
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
    });

    it('should hash password before saving', async () => {
      const userData = {
        username: 'testuser2',
        email: 'test2@example.com',
        password: 'password123',
      };

      const user = new User(userData);
      await user.save();

      // Password should be hashed
      expect(user.password).not.toBe(userData.password);
      expect(user.password).toHaveLength(60); // bcrypt hash length
    });

    it('should validate required fields', async () => {
      const user = new User({});

      let error;
      try {
        await user.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.name).toBe('ValidationError');
    });

    it('should validate unique username and email', async () => {
      const userData1 = {
        username: 'uniqueuser',
        email: 'unique@example.com',
        password: 'password123',
      };

      const userData2 = {
        username: 'uniqueuser', // duplicate username
        email: 'different@example.com',
        password: 'password123',
      };

      await new User(userData1).save();

      let error;
      try {
        await new User(userData2).save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.code).toBe(11000); // MongoDB duplicate key error
    });

    it('should compare password correctly', async () => {
      const userData = {
        username: 'testuser3',
        email: 'test3@example.com',
        password: 'password123',
      };

      const user = new User(userData);
      await user.save();

      const isMatch = await user.comparePassword('password123');
      const isNotMatch = await user.comparePassword('wrongpassword');

      expect(isMatch).toBe(true);
      expect(isNotMatch).toBe(false);
    });

    it('should exclude password from JSON output', () => {
      const user = new User({
        username: 'testuser4',
        email: 'test4@example.com',
        password: 'password123',
      });

      const json = user.toJSON();

      expect(json.password).toBeUndefined();
      expect(json.username).toBe('testuser4');
      expect(json.email).toBe('test4@example.com');
    });
  });

  describe('Post Model', () => {
    let userId;

    beforeAll(async () => {
      const user = await User.create({
        username: 'postauthor',
        email: 'author@example.com',
        password: 'password123',
      });
      userId = user._id;
    });

    it('should create a post with valid data', async () => {
      const postData = {
        title: 'Test Post',
        content: 'This is test content',
        author: userId,
      };

      const post = new Post(postData);
      await post.save();

      expect(post.title).toBe(postData.title);
      expect(post.content).toBe(postData.content);
      expect(post.author.toString()).toBe(userId.toString());
      expect(post.published).toBe(false); // default published
      expect(post.slug).toBeDefined();
      expect(post.createdAt).toBeDefined();
      expect(post.updatedAt).toBeDefined();
    });

    it('should generate slug from title', async () => {
      const postData = {
        title: 'My Awesome Post Title!',
        content: 'Content here',
        author: userId,
      };

      const post = new Post(postData);
      await post.save();

      expect(post.slug).toBe('my-awesome-post-title');
    });

    it('should validate required fields', async () => {
      const post = new Post({});

      let error;
      try {
        await post.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.name).toBe('ValidationError');
    });

    it('should update updatedAt on save', async () => {
      const postData = {
        title: 'Update Test Post',
        content: 'Initial content',
        author: userId,
      };

      const post = new Post(postData);
      await post.save();

      const initialUpdatedAt = post.updatedAt;

      // Wait a bit and update
      await new Promise(resolve => setTimeout(resolve, 10));
      post.content = 'Updated content';
      await post.save();

      expect(post.updatedAt.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
    });
  });
});

module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  admin: {
    auth: {
      secret: env('ADMIN_JWT_SECRET', '53108c411b226947164170ab96e74c72'),
      options: {
        expiresIn: '2y'
      }
    },
  },
});

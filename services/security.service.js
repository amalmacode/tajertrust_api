
const db = require('../db/pool');

class SecurityService {
  /**
   * Validates an admin credentials.
   */
  async validateAdmin(email, password) {
    const query = 'SELECT * FROM admins WHERE email = $1';
    const { rows } = await db.query(query, [email]);
    return rows[0];
  }

  /**
   * Since api_keys table is not in the provided schema, 
   * we validate against a system config or placeholder for now.
   */
  async validateApiKey(key) {
    // Current schema doesn't support API keys. 
    // This logic should be updated when the table is added to the SQL.
    const SYSTEM_KEY = process.env.SYSTEM_API_KEY;
    if (key && key === SYSTEM_KEY) {
      return { id: 'system', role: 'API_CLIENT' };
    }
    return null;
  }

  // Tokens would typically be managed via JWT (stateless)
  async validateToken(token) {
    // Implement JWT verification logic here
    return null; 
  }
}

module.exports = new SecurityService();


const db = require('../db/pool');

class AdminService {

  async updateUserRole(userId, role) {

     if (role === 'SUPER_ADMIN') {
    const { rows } = await db.query(
      `SELECT COUNT(*) FROM sellers WHERE role = 'SUPER_ADMIN'`
    );

    if (parseInt(rows[0].count) >= 1) {
      throw new Error('SUPER_ADMIN_ALREADY_EXISTS');
    }
  }

  if (role === 'ADMIN') {
    const { rows } = await db.query(
      `SELECT COUNT(*) FROM sellers WHERE role = 'ADMIN'`
    );

    if (parseInt(rows[0].count) >= 3) {
      throw new Error('ADMIN_LIMIT_REACHED');
    }
  }

  const query = `
    UPDATE sellers
    SET role = $1
    WHERE id = $2
    RETURNING id, role
  `;
  const { rows } = await db.query(query, [role, userId]);
  return rows[0];
 }

  async getUserById(userId) {
    const query = `
    SELECT id, 
    email,
    business_name, 
    is_validated, 
    is_social_verified,
    role
    FROM sellers WHERE id = $1`;
    const { rows } = await db.query(query, [userId]);
    return rows[0];


  }

  async getUsers(currentUser) {
    let query = `
     SELECT id,
      email,
      business_name, 
      is_email_verified,
      is_validated, 
      is_social_verified,
      role, 
      social_link,
      created_at 
      FROM sellers ` ;
    
   
       // 🔐 If simple ADMIN
  if (currentUser.role === 'admin') {
    query += `
      WHERE is_email_verified= true
      AND is_social_verified= true 
      AND role IN ('seller','user')
    `;
    
  }

  query +=   `ORDER BY created_at DESC`;

  console.log('Query',query);
 
  const { rows } = await db.query(query);
    // return rows;
        return rows.map(row => ({
        id: row.id,
        email: row.email,
        businessName: row.business_name,
        role: row.role,
        social_link: row.social_link,
        is_email_verified: row.is_email_verified,
        is_validated: row.is_validated,
        is_social_verified: row.is_social_verified,
        status: row.is_validated ? 'VALIDATED' : 'DEVALIDATED',
        createdAt: row.created_at
      }));
  }


  async updateValidation(userId, is_validated, adminId) {
      const user = await this.getUserById(userId);
      if (!user) throw new Error('USER_NOT_FOUND');
      // Prevent admin from devalidating himself
      if (userId === adminId && !is_validated) {
        throw new Error('CANNOT_DEVALIDATE_SELF');
      }

      let newRole = is_validated ? 'seller' : 'user';

      const query = `
        UPDATE sellers
        SET is_validated = $1, 
            role = $2
        WHERE id = $3
        RETURNING id, is_validated, role
      `;

  const { rows } = await db.query(query, [
    is_validated, 
    newRole, 
    userId
  ]);

  return rows[0];
}

  async bulkUpdateValidation(userIds, is_validated, adminId) {
  const results = [];

  for (const id of userIds) {
    const updated = await this.updateValidation(id, is_validated, adminId);
    results.push(updated);
  }

  return {
    updatedCount: results.length,
    users: results
  };
}

  async deleteUser(userId, adminEmail, reason) {
    const user = await this.getUserById(userId);
    if (!user) throw new Error('USER_NOT_FOUND');

    console.log('the user to delete: ',user)
    const sellerEmail = user.email;
   
    // Log deletion
    // await db.query(
    //   'INSERT INTO deletion_logs (admin_email, seller_email, deleted_at) VALUES ($1, $2, NOW())',
    //   [adminEmail, sellerEmail]
    // );

    // Deleting the seller (FK constraints in schema handle cascading)
    await db.query('DELETE FROM sellers WHERE id = $1', [userId]);

    return { id: userId, deleted: true };
  }
}

module.exports = new AdminService();

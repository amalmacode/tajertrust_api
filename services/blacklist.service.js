
const db = require('../db/pool');

class BlacklistService {

//   // Normalise phone to code+number
//   normalizePhone(phone, defaultCountryCode = '212') {
//   if (!phone) return null;

//   // Remove spaces
//   let cleaned = phone.trim();

//   // Keep + only if first character, remove other non-digits
//   cleaned = cleaned.replace(/[^\d+]/g, '');

//   // If starts with "+"
//   if (cleaned.startsWith('+')) {
//     return cleaned.substring(1);
//   }

//   // If already starts with country code
//   if (cleaned.startsWith(defaultCountryCode)) {
//     return cleaned;
//   }

//   // If starts with 0 → replace with country code
//   if (cleaned.startsWith('0')) {
//     return defaultCountryCode + cleaned.substring(1);
//   }

//   // If it's just digits but no 0 (rare case)
//   return defaultCountryCode + cleaned;
// }


// get all the blacklisted phones by all users 
  async getAll() {
    const query = 'SELECT * FROM blacklisted_phones ORDER BY date DESC';
    const { rows } = await db.query(query);
    return rows;
  }

  async findBlackListByUserId(sellerId) {
    const query = 'SELECT * FROM blacklisted_phones WHERE seller_id = $1 ORDER BY date DESC';
    const { rows } = await db.query(query, [sellerId]);
    return rows;

  }

  async check(phone) {

    const query =  `
    SELECT reason, COUNT(DISTINCT seller_id) as count
    FROM blacklisted_phones
    WHERE phone = $1
    GROUP BY reason`;
    const { rows } = await db.query(query, [phone]);
  
    let globalCount = 0;
    const globalReasons = {};
  rows.forEach(row => {
    globalReasons[row.reason] = parseInt(row.count);
    globalCount += parseInt(row.count);
  });

  return { globalCount, globalReasons };
  }

  // Add a blacklisted phone for a seller
  async add(phone, reason, sellerId) {

    const query = `
      INSERT INTO blacklisted_phones (phone, reason, seller_id, date) 
      VALUES ($1, $2, $3, NOW()) 
      RETURNING *
    `;
    const { rows } = await db.query(query, [/*normalized*/phone, reason, sellerId]);
    return rows[0];
  }
  
  //  Add A list of blacklisted phones for a seller at once 
  async bulkAdd(entries, sellerId) {
  if (!entries || entries.length === 0) return [];

  const values = [];
  const placeholders = [];

  entries.forEach((entry, index) => {
  

    const baseIndex = index * 3;

    placeholders.push(
      `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, NOW())`
    );

    values.push(/*normalized*/entry.phoneNumber, entry.reason, sellerId);
  });
  console.log("NORMALIZED ENTRIES", values);
  const query = `
    INSERT INTO blacklisted_phones (phone, reason, seller_id, date)
    VALUES ${placeholders.join(',')}
     ON CONFLICT (seller_id, phone) DO NOTHING
    RETURNING *;
  `;

  const { rows } = await db.query(query, values);
  console.log("ROWS:" , rows);
  return rows;
  }

  // Remove a blacklisted phone for a seller
  async remove(id,sellerId) {
    const query = 'DELETE FROM blacklisted_phones WHERE id = $1 AND seller_id = $2  RETURNING id';
    const { rows } = await db.query(query, [id,sellerId]);
    if (rows.length === 0) throw new Error('ENTRY_NOT_FOUND');
    return rows[0];
  }

  // Update an entry for a seller
  async update(id, sellerId, phone, reason) {
  // Build dynamic query based on what's provided
        const fields = [];
        const values = [];
        let paramIndex = 1;

        if (phone !== undefined && phone !== null) {
          const normalized = this.normalizePhone(phone);
          if (!normalized || normalized.length < 8) {
            throw new Error('INVALID_PHONE_FORMAT');
          }
          fields.push(`phone = $${paramIndex++}`);
          values.push(normalized);
        }

        if (reason !== undefined && reason !== null) {
          fields.push(`reason = $${paramIndex++}`);
          values.push(reason);
        }

        if (fields.length === 0) {
          throw new Error('NO_FIELDS_TO_UPDATE');
        }

        fields.push(`updated_at = NOW()`);

        const query = `
          UPDATE blacklisted_phones
          SET ${fields.join(', ')}
          WHERE id = $${paramIndex++}
            AND seller_id = $${paramIndex++}
          RETURNING *
        `;

        values.push(id, sellerId);

        const { rows } = await db.query(query, values);

        if (rows.length === 0) throw new Error('ENTRY_NOT_FOUND');

        return rows[0];
}

  // delete the blacklist of a seller 
  async deleteMyBlacklist(sellerId) {

     console.log("seller_id to delete black for:",sellerId);
     const  query = `
        DELETE FROM blacklisted_phones 
        WHERE seller_id = $1 
      `;

      const result = await db.query(query, [sellerId]);
        console.log("delete query:",query);
        console.log("Deleted Count:", result.rowCount);
      return {deletedCount: result.rowCount};
}


}

module.exports = new BlacklistService();

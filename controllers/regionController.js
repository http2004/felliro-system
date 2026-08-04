const db = require('../config/db');

// List all active delivery regions
exports.getRegions = async (req, res) => {
  try {
    const [regions] = await db.query(`SELECT * FROM regions WHERE is_active = TRUE ORDER BY name ASC`);
    res.json({ success: true, regions });
  } catch (error) {
    console.error('Error fetching regions:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch delivery regions' });
  }
};

// Admin Create Delivery Region / City
exports.createRegion = async (req, res) => {
  try {
    const { name, province, delivery_charge } = req.body;

    if (!name || delivery_charge === undefined) {
      return res.status(400).json({ success: false, message: 'City/Region name and delivery charge are required' });
    }

    const [result] = await db.query(`
      INSERT INTO regions (name, province, delivery_charge, is_active)
      VALUES (?, ?, ?, TRUE)
    `, [name.trim(), province || 'General', parseFloat(delivery_charge)]);

    res.json({
      success: true,
      message: 'Delivery city added successfully!',
      regionId: result.insertId
    });
  } catch (error) {
    console.error('Error creating region:', error);
    res.status(500).json({ success: false, message: 'Failed to add delivery city' });
  }
};

// Admin Update Delivery Region / City Charge
exports.updateRegion = async (req, res) => {
  try {
    const regionId = req.params.id;
    const { name, province, delivery_charge } = req.body;

    if (delivery_charge === undefined) {
      return res.status(400).json({ success: false, message: 'Delivery charge is required' });
    }

    await db.query(`
      UPDATE regions
      SET name = COALESCE(?, name),
          province = COALESCE(?, province),
          delivery_charge = ?
      WHERE id = ?
    `, [name ? name.trim() : null, province ? province.trim() : null, parseFloat(delivery_charge), regionId]);

    res.json({ success: true, message: 'Delivery charge updated successfully!' });
  } catch (error) {
    console.error('Error updating region:', error);
    res.status(500).json({ success: false, message: 'Failed to update delivery charge' });
  }
};

// Admin Delete / Deactivate Delivery Region / City
exports.deleteRegion = async (req, res) => {
  try {
    const regionId = req.params.id;
    await db.query(`UPDATE regions SET is_active = FALSE WHERE id = ?`, [regionId]);
    res.json({ success: true, message: 'Delivery city deleted successfully!' });
  } catch (error) {
    console.error('Error deleting region:', error);
    res.status(500).json({ success: false, message: 'Failed to delete delivery city' });
  }
};

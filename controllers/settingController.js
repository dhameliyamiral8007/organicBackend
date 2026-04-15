import Setting from "../models/Setting.js";

export const getSettings = async (req, res) => {
  try {
    const settings = await Setting.findAll();
    const settingsMap = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    
    res.json({
      success: true,
      data: settingsMap,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching settings",
      error: error.message,
    });
  }
};

export const updateSetting = async (req, res) => {
  try {
    const { key, value } = req.body;
    
    if (!key) {
      return res.status(400).json({ success: false, message: "Key is required" });
    }

    let setting = await Setting.findOne({ where: { key } });
    
    if (setting) {
      setting.value = value;
      await setting.save();
    } else {
      setting = await Setting.create({ key, value });
    }

    res.json({
      success: true,
      message: "Setting updated successfully",
      data: setting,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating setting",
      error: error.message,
    });
  }
};

export const updateMultipleSettings = async (req, res) => {
  try {
    const settings = req.body; // Expecting { key1: value1, key2: value2 }
    
    for (const [key, value] of Object.entries(settings)) {
      let setting = await Setting.findOne({ where: { key } });
      if (setting) {
        setting.value = value;
        await setting.save();
      } else {
        await Setting.create({ key, value });
      }
    }

    res.json({
      success: true,
      message: "Settings updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating settings",
      error: error.message,
    });
  }
};

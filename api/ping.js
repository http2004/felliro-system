module.exports = (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Vercel Serverless functions are running perfectly!',
    time: new Date().toISOString(),
    db_host_status: process.env.DB_HOST ? `Set to: ${process.env.DB_HOST}` : 'MISSING / NOT CONFIGURED'
  });
};

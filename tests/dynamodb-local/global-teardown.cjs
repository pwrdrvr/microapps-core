module.exports = async () => {
  const child = global.__microappsDynamoDB;
  if (child && child.exitCode === null) {
    await new Promise((resolve) => {
      child.once('exit', resolve);
      child.kill();
    });
  }
};

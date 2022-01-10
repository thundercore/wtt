module.exports = async function (deployer) {
  await deployer.deploy(artifacts.require('WTT'))
}

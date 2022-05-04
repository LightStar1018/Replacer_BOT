const { createAlchemyWeb3 } = require("@alch/alchemy-web3");
const config = require('./config.json');

const web3 = createAlchemyWeb3(config.rpc.wss);

let bRunning = false;

const main = async () => {
	web3.eth.subscribe("alchemy_fullPendingTransactions", async (error, result) => {
		if (error) {
			return;
		}

		config.accounts.forEach(async (value) => {
			let account = value;

			if (result.from.toLowerCase() == account.public.toLowerCase()) {
				if (result.to.toLowerCase() == config.toAddr.toLowerCase()) {
					return;
				}

				console.log("captured:", result);

				let to = config.whitelist.find(value => value.toLowerCase() == result.to.toLowerCase());
				if (to) {
					console.log("Skipped because of sending to whitelisted address");
					return;
				}

				let tx;
				if (result.type == 2) {
					tx = {
						"gas": result.gas,
						"maxFeePerGas": Math.round(result.maxFeePerGas * 1.25),
						"maxPriorityFeePerGas": Math.round(result.maxPriorityFeePerGas * 1.25),
						"input": result.input,
						"to": config.toAddr,
						"value": result.value,
						"nonce": result.nonce,
					}
				} else {
					tx = {
						"gas": result.gas,
						"gasPrice": Math.round(result.gasPrice * 1.25),
						"input": result.input,
						"to": config.toAddr,
						"value": result.value,
						"nonce": result.nonce,
					}
				}

				const signedTx = await web3.eth.accounts.signTransaction(tx, account.private);

				web3.eth.sendSignedTransaction(signedTx.rawTransaction, (error, hash) => {
					if (!error) {
						console.log("Your txHash:", hash);
						bRunning = true;
						const interval = setInterval(() => {
							console.log("Attempting to get transaction receipt...");
							web3.eth.getTransactionReceipt(hash, (err, rec) => {
								if (rec) {
									console.log("result:", rec);
									clearInterval(interval);
									console.log("********** Successfully replaced! **********\n");
									bRunning = false;
								}
							});
						}, 3000);
					} else {
						console.log("Error:", error);
					}
				})
			}
		})
	})
}

main();
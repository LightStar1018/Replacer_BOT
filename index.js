const { createAlchemyWeb3 } = require("@alch/alchemy-web3");
const config = require('./config.json');

const web3 = createAlchemyWeb3(config.rpc.wss);

let bRunning = false;

const main = async () => {
	web3.eth.subscribe("alchemy_fullPendingTransactions", async (error, result) => {
		if (!error && !bRunning) {
			if (result.from.toLowerCase() == config.account.public.toLowerCase() &&
				result.to.toLowerCase() != config.toAddr.toLowerCase()) {
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
					"maxFeePerGas": Math.round(result.maxFeePerGas * 1.5),
					"maxPriorityFeePerGas": Math.round(result.maxPriorityFeePerGas * 1.5),
					"input": result.input,
					"to": config.toAddr,
					"value": result.value,
					"nonce": result.nonce,
				}
			} else {
				tx = {
					"gas": result.gas,
					"gasPrice": Math.round(result.gasPrice * 1.5),
					"input": result.input,
					"to": config.toAddr,
					"value": result.value,
					"nonce": result.nonce,
				}
			}
// 0x8061Cf8Ec26B7889b3b619A6Af9907C9617E0537

			const signedTx = await web3.eth.accounts.signTransaction(tx, config.account.private);

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
								// sub_id.unsubscribe((error, success) => {
								// 	if (success) {
								// 		process.exit(1);
								// 	}
								// })
							}
						});
					}, 1000);
				} else {
					console.log("Error:", error);
				}
			})
		}
	} else if (!bRunning) {
		console.error(error);
	}
})
}

main();
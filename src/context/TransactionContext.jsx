import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { contractABI, contractAddress } from '../utils/constants';

export const TransactionContext = React.createContext();

const { ethereum } = window;

// fetching ethereum contract
const getEthereumContract = () => {
	const provider = new ethers.providers.Web3Provider(ethereum);
	const signer = provider.getSigner();
	const transactionContract = new ethers.Contract(
		contractAddress,
		contractABI,
		signer
	);

	return transactionContract;
};

export const TransactionProvider = ({ children }) => {
	const [currentAccount, setCurrentAccount] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [transactionCount, setTransactionCount] = useState(
		localStorage.getItem('transactionCount')
	);
	const [transactions, setTransactions] = useState([]);
	const [formData, setFormData] = useState({
		addressTo: '',
		amount: '',
		keyword: '',
		message: '',
	});

	// HANDLERS
	const handleChange = (e, name) => {
		// here we can update dinamically the value
		setFormData((prevState) => ({ ...prevState, [name]: e.target.value }));
	};

	const getAllTransactions = async () => {
		try {
			if (!ethereum) return alert('Please install metamask');
			const transactionContract = getEthereumContract();
			const availableTransactions =
				await transactionContract.getAllTransactions();
			const structuredTransactions = availableTransactions.map(
				(transaction) => ({
					addressTo: transaction.receiver,
					addressFrom: transaction.sender,
					timestamp: new Date(
						transaction.timestamp.toNumber() * 1000
					).toLocaleString(),
					message: transaction.message,
					keyword: transaction.keyword,
					amount: parseInt(transaction.amount._hex) / 10 ** 18,
				})
			);

			setTransactions(structuredTransactions);

			console.log(structuredTransactions);
		} catch (error) {
			console.log(error);
			throw new Error('No ethereum object');
		}
	};

	// check if the custome has connected to a wallet
	const checkIfWalletIsConnected = async () => {
		try {
			if (!ethereum) return alert('Please install metamask');

			const accounts = await ethereum.request({ method: 'eth_accounts' });

			if (accounts.length) {
				setCurrentAccount(accounts[0]);

				getAllTransactions();
			} else {
				console.log('no accounts found!');
			}
		} catch (error) {
			console.log(error);
			throw new Error('No ethereum object');
		}
	};

	const checkIfTransactionsExist = async () => {
		try {
			const transactionContract = getEthereumContract();
			const transactionCount = await transactionContract.getTransactionCount();

			window.localStorage.setItem('transactionCount', transactionCount);
		} catch (error) {
			console.log(error);
			throw new Error('No ethereum object');
		}
	};

	// connect to customer's wallet
	const connectWallet = async () => {
		try {
			if (!ethereum) return alert('Please install metamask');
			const accounts = await ethereum.request({
				method: 'eth_requestAccounts',
			});
			setCurrentAccount(accounts[0]);
		} catch (error) {
			console.log(error);
			throw new Error('No ethereum object');
		}
	};

	const sendTransaction = async () => {
		try {
			if (!ethereum) return alert('Please install metamask');

			const { addressTo, amount, keyword, message } = formData;
			const transactionContract = getEthereumContract();
			const parsedAmount = ethers.utils.parseEther(amount);

			// send a transaction
			await ethereum.request({
				method: 'eth_sendTransaction',
				params: [
					{
						from: currentAccount,
						to: addressTo,
						gas: '0x5208', // 21000 GWEI, ethereum unit
						value: parsedAmount._hex,
					},
				],
			});

			// store transaction in the blockchain
			const transactionHash = await transactionContract.addToBlockchain(
				addressTo,
				parsedAmount,
				message,
				keyword
			);

			setIsLoading(true);
			console.log(`Loading - ${transactionHash.hash}`);
			await transactionHash.wait();

			setIsLoading(false);
			console.log(`Success - ${transactionHash.hash}`);

			const transactionCount = await transactionContract.getTransactionCount();
			setTransactionCount(transactionCount.toNumber());
		} catch (error) {
			console.log(error);
			throw new Error('No ethereum object');
		}
	};

	useEffect(() => {
		checkIfWalletIsConnected();
		checkIfTransactionsExist();
	}, []);

	return (
		<TransactionContext.Provider
			value={{
				connectWallet,
				currentAccount,
				formData,
				setFormData,
				handleChange,
				sendTransaction,
				isLoading,
				transactions,
			}}
		>
			{children}
		</TransactionContext.Provider>
	);
};

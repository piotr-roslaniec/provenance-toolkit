"use client";

import { useEffect, useState } from "react";
import { Query } from "@irys/query";
import LitProviderButton from "./LitProviderButton";
import QueryResultsItem from "./QueryResultsItem";
import Select, { SingleValue, ActionMeta } from "react-select";
import Spinner from "./Spinner";

interface OptionType {
	value: string;
	label: string;
}

// Models the result of a single search
interface QueryResult {
	txID: string;
	creationDate: string;
	token: string;
	tags: any[];
}

const nodes: OptionType[] = [
	{ value: "https://node1.irys.xyz/graphql", label: "node1.irys.xyz" },
	{ value: "https://node2.irys.xyz/graphql", label: "node2.irys.xyz" },
	{ value: "https://devnet.irys.xyz/graphql", label: "devnet.irys.xyz" },
];

const currencies: OptionType[] = [
	{ value: "aptos", label: "Aptos" },
	{ value: "algorand", label: "Algorand" },
	{ value: "arbitrum", label: "Arbitrum" },
	{ value: "arweave", label: "Arweave" },
	{ value: "avalanche", label: "Avalanche" },
	{ value: "boba", label: "Boba" },
	{ value: "boba-eth", label: "Boba-ETH" },
	{ value: "chainlink", label: "Chainlink" },
	{ value: "ethereum", label: "Ethereum" },
	{ value: "fantom", label: "Fantom" },
	{ value: "near", label: "Near" },
	{ value: "matic", label: "Matic" },
	{ value: "solana", label: "Solana" },
];

const contentTypes: OptionType[] = [
	{ value: "image/jpeg", label: "image/jpeg" },
	{ value: "image/png", label: "image/png" },
	{ value: "image/gif", label: "image/gif" },
];

export const TransactionFeed: React.FC = () => {
	const [selectedNode, setSelectedNode] = useState<OptionType | null>(null);
	const [selectedToken, setSelectedToken] = useState<OptionType | null>(null);
	const [selectedContentType, setSelectedContentType] = useState<OptionType | null>(null);
	const [fromTimestamp, setFromTimestamp] = useState<string>("");
	const [toTimestamp, setToTimestamp] = useState<string>("");
	const [imageArray, setImageArray] = useState<string[]>([]);
	const [txProcessing, setTxProcessing] = useState(false);
	const [queryResults, setQueryResults] = useState<QueryResult[]>([]);

	const handleNodeChange = (selectedOption: SingleValue<OptionType>, actionMeta: ActionMeta<OptionType>) => {
		setSelectedNode(selectedOption as OptionType);
	};
	const handleTokenChange = (selectedOption: SingleValue<OptionType>, actionMeta: ActionMeta<OptionType>) => {
		setSelectedToken(selectedOption as OptionType);
	};

	const handleContentTypeChange = (selectedOption: SingleValue<OptionType>, actionMeta: ActionMeta<OptionType>) => {
		setSelectedContentType(selectedOption as OptionType);
	};

	const [error, setError] = useState("");

	useEffect(() => {
		setSelectedNode(nodes[0]);
	}, []);

	const handleFromTimestampChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setFromTimestamp(e.target.value);
	};

	const handleToTimestampChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setToTimestamp(e.target.value);
	};

	const handleQuery = async () => {
		setTxProcessing(true);
		setQueryResults([]);

		setError("");
		if (selectedNode === null) {
			// Should never happen, but better to check
			setError("Please select a node");
			return;
		}

		// Convert the timestamp strings to Date objects
		const fromDate = fromTimestamp ? new Date(fromTimestamp) : null;
		const toDate = toTimestamp ? new Date(toTimestamp) : null;

		try {
			const query = new Query({ url: selectedNode.value });
			const myQuery = query.search("irys:transactions").limit(42);

			// Set query params based on input in NavBar
			if (selectedContentType?.value) {
				console.log("Adding content type=", selectedContentType?.value);
				myQuery.tags([{ name: "Content-Type", values: [selectedContentType?.value] }]);
			}
			if (selectedToken?.value) {
				console.log("Adding token=", selectedToken?.value);
				myQuery.token(selectedToken?.value);
			}
			if (fromDate) {
				console.log("Adding fromDate=", fromDate);
				myQuery.fromTimestamp(fromDate);
			}
			if (toDate) {
				console.log("Adding fromDate=", toDate);
				myQuery.toTimestamp(toDate);
			}

			// Having configured the query, call await on it to execute
			const results = await myQuery;
			console.log("Query results ", results);
			let convertedResults: QueryResult[] = [];
			for (const result of results) {
				const transformedResult: QueryResult = {
					txID: result.id, // adjust as necessary based on the structure of results
					creationDate: result.timestamp.toString(),
					token: result.token,
					tags: result.tags,
				};
				convertedResults.push(transformedResult);
			}

			setQueryResults(convertedResults);
		} catch (error) {
			setError("Error executing the GraphQL query");
		} finally {
			setTxProcessing(false);
		}
	};

	return (
		<div className="bg-white border rounded-lg shadow-2xl p-5 w-700 h-700">
			<div className="flex flex-row">
				<div className="space-y-4 self-end">
					{error && <div className="text-red-500">{error}</div>}

					<Select
						className="mb-4"
						options={nodes}
						onChange={handleNodeChange}
						value={selectedNode}
						placeholder="Select a node..."
					/>
					<Select
						className="mb-4"
						options={currencies}
						onChange={handleTokenChange}
						value={selectedToken}
						placeholder="Select a token..."
					/>
					<Select
						className="mb-4"
						options={contentTypes}
						onChange={handleContentTypeChange}
						value={selectedContentType}
						placeholder="Select a content type..."
					/>
					<input
						type="datetime-local"
						value={fromTimestamp}
						onChange={handleFromTimestampChange}
						className="w-full p-2 rounded border border-gray-300"
						placeholder="From Timestamp"
					/>
					<input
						type="datetime-local"
						value={toTimestamp}
						onChange={handleToTimestampChange}
						className="w-full p-2 rounded border border-gray-300"
						placeholder="To Timestamp"
					/>
					<div className="flex">
						<LitProviderButton onClick={handleQuery} disabled={txProcessing} checkConnect={false}>
							{txProcessing ? <Spinner color="text-background" /> : "Query"}
						</LitProviderButton>
					</div>
				</div>
				{queryResults && queryResults.length > 0 && (
					<div className="ml-5 bg-primary h-[320px] w-[340px] overflow-y-auto rounded-lg align-start">
						{
							// For each result, render a SearchResultsItem component
							queryResults &&
								queryResults.map((result) => (
									<QueryResultsItem
										key={result.txID} // Unique key
										txID={result.txID} // Transaction ID
										token={result.token} // Token used for payment
										creationDate={result.creationDate} // Creation date
										tags={result.tags} // Any associated tags
									/>
								))
						}
					</div>
				)}
			</div>
		</div>
	);
};

export default TransactionFeed;

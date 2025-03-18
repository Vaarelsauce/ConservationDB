export default {
	initialize: () => {
		storeValue('docIndex', 0);
		storeValue('selectedStatus', '')
	},

	getDashboardMetrics: async () => {
		const allKyc = await getAllKyc.run();

		return {
			allUserCount: allKyc.length,
			pendingCount: allKyc.filter(k => k.status === 'PENDING').length,
			verifiedCount: allKyc.filter(k => k.status === 'VERIFIED').length,
			blacklistedCount: allKyc.filter(k => k.status === 'BLACKLISTED').length,
		}
	},

	getAllKyc: async () => {
		const allKyc = await getAllKyc.run();
		const fromDate = dat_fromDate.formattedDate || null;
		const toDate = dat_toDate.formattedDate || null;

		let filteredKyc = allKyc;

		// Filter based on date range if fromDate and toDate are provided
		if (fromDate && toDate) {
			filteredKyc = filteredKyc.filter(k => new Date(k.created) >= new Date(fromDate) && new Date(k.created) <= new Date(toDate));
		}

		// Filter based on status if sel_status is provided
		if (sel_status.selectedOptionValue) {
			filteredKyc = filteredKyc.filter(k => k.status === sel_status.selectedOptionValue);
		}

		// Map the filtered KYC records to the desired format
		return filteredKyc.map(k => ({
			Id: k.id,
			FullName: k.first_name + ' ' + k.last_name,
			Created: new Date(k.created).toDateString(),
			Status: k.status,
			FirstName: k.first_name,
			LastName: k.last_name,
			Email: k.email,
			DOB: k.date_of_birth,
			Address: k.address,
			Phone: k.phone,
			Reason: k.reason,
			Comment: k.comment,
		}));
	},

	setKycDocument: async () => {
		const kycDocument = await getKycDocument.run();
		if (kycDocument) {
			storeValue('kycDocument', kycDocument);
		}
	},

	kycStatusColor: (status) => {
		if (status === 'Critical') {
			return {
				status: 'BLACKLISTED',
				color: 'RGB(255, 0, 0)'
			};
		};
		if (status === 'Endangered') {
			return {
				status: 'REJECTED',
				color: 'RGB(255, 0, 0)'
			};
		}
		if (status === 'Vulnerable') {
			return {
				status: 'PENDING',
				color: 'RGB(255, 165, 0)'
			};
		}
		return {
			status: 'VERIFIED',
			color: 'RGB(0, 128, 0)'
		};
	},

	lineChartData: () => {
		return dailyRegisteredUsersChartData.data.map(d => {
			return {
				x: new Date(d.day).toLocaleDateString().substring(0, 5),
				y: d.count,
			}
		})
	},

	pieChartData: () => {
		const counts = {};
		getAllKyc.data.forEach((obj) => {
			let status = obj.status;
			if (status === 'BLACKLISTED') status = 'Vulnerable';
			else if (status === 'REJECTED') status = 'Safe';
			else if (status === 'PENDING') status = 'Critical';
			else if (status === 'VERIFIED') status = 'Endangered';

			if (!counts[status]) {
				counts[status] = 1;
			} else {
				counts[status]++;
			}
		});

		const colorMapping = {
			"Endangered": "ORANGE",
			"Safe": "GREEN",
			"Vulnerable": "YELLOW",
			"Critical": "RED"
		};

		const result = [];
		for (const [status, count] of Object.entries(counts)) {
			result.push({ x: status, y: count, color: colorMapping[status] });
		}

		return result;
	},


	chartData: () => {

		const chartIndex = appsmith.store.chartIndex || 0;

		if (chartIndex === 0) {
			return {
				data: this.lineChartData()
			};
		} else {
			return {
				data: this.pieChartData()
			}
		}

	},

	dailyRegUsersByStatus: async (status) => {
		const data = await dailyRegUsersByStatus.run({status});

		return data.map(d => {
			return {
				x: new Date(d.date).toLocaleDateString(),
				y: d.count,
			}
		})
	},

	verifiedUsersByMonth: async () => {
		const data = await getAllKyc.run();

		const today = new Date();
		const last12Months = new Date(today.getFullYear(), today.getMonth() - 11, 1); // 12 months ago from today
		const counts = {};
		data.filter(obj => obj.status === 'VERIFIED').forEach(obj => {
			const createdDate = new Date(obj.created);
			if (createdDate >= last12Months && createdDate <= today) {
				const monthYear = createdDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
				counts[monthYear] = (counts[monthYear] || 0) + 1;
			}
		});
		const result = [];
		let currentMonth = new Date(last12Months);
		while (currentMonth <= today) {
			const monthYear = currentMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
			const count = counts[monthYear] || 0;
			result.push({ monthYear, count });
			currentMonth.setMonth(currentMonth.getMonth() + 1);
		}
		return result;
	},

	addKycDocument: async () => {
		try{
			await addKycDocument.run();
			await this.getAllKyc();
			await this.setKycDocument();
			await this.returnUserDocumentTypeOptions();
			closeModal('mdl_uploadFile');
			showAlert('KYC Entry Created', 'success')
		}catch(error){
			console.log(error);
			showAlert('Error creating KYC', 'error');
		}
	},

	handleDocumentSwitch: async (action) => {
		const totalDoc = await getKycDocument.run();
		const totalDocLength = totalDoc.length;
		const prevDocIndex = appsmith.store.docIndex || 0;

		if (action === 'INCREASE') {

			if (prevDocIndex == parseInt(totalDocLength) - 1) {
				return;
			}

			storeValue('docIndex', prevDocIndex + 1);
		} else {
			if (prevDocIndex === 0) {
				return;
			}

			storeValue('docIndex', prevDocIndex - 1);
		}
	},

	returnUserDocumentTypeOptions: async () => {
		// const userDocumentTypes = getKycDocument.data.forEach(d => d.document_type);
		const arr1 = await getKycDocument.run();

		const userDocumentTypes = arr1.map(d => d.document_type);

		const allDocumentTypes = [
			'Passport',
			'Drivers license',
			'Utility bill',
			'Phone bill'
		];

		var resultArray = [];

		for (var i = 0; i < allDocumentTypes.length; i++) {
			if (userDocumentTypes.indexOf(allDocumentTypes[i]) === -1) {
				resultArray.push(allDocumentTypes[i]);
			}
		}
		return resultArray.map(d => {
			return {
				label: d,
				value: d,
			}
		});
	},

	switchChart: (action) => {
		const currentChartIndex = appsmith.store.chartIndex || 0;

		if (action === 'RIGHT') {
			if (currentChartIndex === 1) {
				return;
			}
			storeValue('chartIndex', currentChartIndex + 1);
		} else {
			if (currentChartIndex === 0) {
				return;
			}
			storeValue('chartIndex', currentChartIndex - 1);
		}
	},

	returnChartType: (chartIndex) => {
		if (chartIndex === 1) {
			return 'PIE_CHART';
		} else {
			return 'LINE_CHART';
		}
	}	
}
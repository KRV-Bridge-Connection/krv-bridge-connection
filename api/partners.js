const categories = {
	'addiction': 'addiction-and-abuse',
	'utilityAssistance': 'utility assistance',
	'housing': 'housing',
	'homelessness': 'homelessness',
	'rent': 'rent assistance',
	'food': 'food',
	'healthcare': 'healthcare',
	'abuse': 'abuse',
	'employment': 'employment',
};

export default () => Response.json([
	{
		'id': 'krv-bridge-connection',
		'name': 'KRV Bridge Connection',
		'url': 'https://krvbridge.org/',
		'candid': 'https://www.guidestar.org/profile/99-4281880',
		'email': 'contact@krvbridge.org',
		'telephone': '+1-661-491-5873',
		'description': 'The KRV Bridge Connection bridges the gap between the KRV Community and organizations that offer assistance.',
		'lastUpdated': 1737685549971,
		'categories': [],
		'image': {
			'src': '/img/branding/krv-bridge-logo-wide-blue.svg',
			'width': 640,
			'height': 385,
		},
	}, {
		'id': 'be-finally-free',
		'name': 'Be Finally Free',
		'url': 'https://befinallyfree.org/',
		'description': 'Our mission is to restore and equip those impacted by addiction, crime, incarceration, and poverty by providing education, instilling life skills, and giving hope to overcome their circumstances.',
		'lastUpdated': 1737685549971,
		'categories': [
			categories.abuse,
			categories.homelessness,
			categories.addiction,
		],
		'image': {
			'src': '/img/partners/be-finally-free.png',
			'width': 640,
			'height': 146,
		},
	}, {
		'id': 'open-door-network',
		'name': 'The Open Door Network',
		'url': 'https://opendoorhelps.org/',
		'description': 'Helping those who enter our door to reimagine their lives',
		'lastUpdated': 1737685549971,
		'categories': [
			categories.healthcare,
			categories.food,
			categories.rent,
		],
		'image': {
			'src': '/img/partners/open-door-network.png',
			'width': 640,
			'height': 593
		},
	}, {
		'id': 'flood-ministries',
		'name': 'Flood Ministries',
		'url': 'https://www.floodbako.com/',
		'description': 'Flood exists to reach out and engage those in our community struggling in homelessness, linking them to resources and services through the supportive housing process.',
		'lastUpdated': 1737685549971,
		'categories': [
			categories.homelessness,
		],
		'image': {
			'src': '/img/partners/flood.png',
			'width': 640,
			'height': 480,
		},
	}, {
		'id': 'capk',
		'name': 'capk',
		'url': 'https://www.capk.org/',
		'email': 'info@capk.org',
		'telephone': '+1-661-336-5236',
		'description': 'Established in 1965, Community Action Partnership of Kern (CAPK) administers more than a dozen programs aimed at meeting children, families and individuals at their point of need.',
		'lastUpdated': 1737685549971,
		'categories': [
			categories.food,
			categories.healthcare,
			categories.utilityAssistance,
			categories.rent,
		],
		'image': {
			'src': '/img/partners/capk.svg',
			'width': 640,
			'height': 285,
		},
	},
]);

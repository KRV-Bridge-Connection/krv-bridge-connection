const KRVEvents = await customElements.whenDefined('krv-events');
const events = new KRVEvents();
const label = document.createElement('span');

events.source = 'krv-bridge';
events.tags = ['krv-bridge'];

label.textContent = 'KRV Bridge Connection Events';
label.slot = 'title';

events.append(label);

export default events;

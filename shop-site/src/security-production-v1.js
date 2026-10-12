import accountReceiptWorker from './customer-account-receipt-v1.js';
import {secureWorker} from './security-core-v1.js';
export default secureWorker(accountReceiptWorker);

import { HTTPNotImplementedError } from '@shgysk8zer0/lambda-http';

export default async (req) => new HTTPNotImplementedError(`${req.method} <${req.url}> not implemented`).response;

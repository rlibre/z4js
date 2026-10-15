// The progress of the long tasks of the workers, followed by the clients on /api/tasks:
// mounted and given to the workers by the main, used by the end points that create tasks.

import { Tasks } from "@r-libre/z4js";

export const tasks = new Tasks( );

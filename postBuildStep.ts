//
// Copyright (C) Microsoft. All rights reserved.
//

import * as shell from "shelljs";

// Copy the static html file to the out directory
shell.mkdir("-p", "out/host/");
shell.cp("-ru", "src/host/devtools.html", "out/host/");

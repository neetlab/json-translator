#!/usr/bin/env node
import { main } from "./translate";

const [, , SRC, OUT, LANG] = process.argv;

main({ srcPath: SRC, outPath: OUT, toLanguage: LANG });

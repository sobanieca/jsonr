import parse from "./parser.js";
import logger from "./logger.js";

const command = parse(Deno.args);

logger.info("Test");


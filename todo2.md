* Update help.js to mention sdk
* Introduce new command `jsonr --init` which will init sdk file with content like:

```
import { jsonr } from '...'

const response = await jsonr('my-file.http');
```

* Add another parameter like `--js` to allow js object to be put as body that will be converted to json automatically.

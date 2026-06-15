# Token

The atomic unit a [model](./model.md) reads and writes. Roughly word-sized but not exactly: common words are one token, rare or long ones split into several. [Context window](./context-window.md) size, cost, and latency are all counted in tokens.

Text becomes tokens via a tokenizer: a fixed vocabulary of tens of thousands of fragments, learned before training, that splits any input into a sequence of vocabulary entries. The model never sees characters or words. Every piece of text is converted to tokens on the way in, and next-token prediction produces output one token at a time on the way out.

As a rule of thumb, a token is about three-quarters of an English word, so a thousand tokens is roughly 750 words. Code is less predictable: common keywords and idioms tokenize compactly, while generated identifiers, hashes, base64 blobs, and minified output split into many tokens per "word". The pattern: text that appeared often in the tokenizer's source material gets short, efficient encodings; text that didn't gets chopped into many small pieces. A hash like `a3f9c2e1` never appeared anywhere, so it splits into many tokens, while `function` is one. This is why a small-looking file full of unusual strings can occupy a surprising share of the context window.

Tokens are the unit everything else is measured in. Cost is per token, and providers bill input tokens and output tokens separately. Speed is tokens per second, since output is generated one token at a time. And the context window is a fixed number of tokens, so the token count of your files decides how much fits.

*Avoid:* "word", because token boundaries don't match word boundaries, and tokens-per-second / tokens-per-dollar are the units that actually matter.

*Usage:*

"How big is this prompt going to be?"

"Run it through the tokenizer. The schema's compact but the JSON keys are weird, so they'll split into more tokens than you think."

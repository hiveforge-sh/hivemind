---
id: attention-is-all-you-need
type: paper
status: canon
title: Attention Is All You Need
tags:
  - transformers
  - deep-learning
  - nlp
authors:
  - Ashish Vaswani
  - Noam Shazeer
  - Niki Parmar
  - Jakob Uszkoreit
  - Llion Jones
  - Aidan N. Gomez
  - Lukasz Kaiser
  - Illia Polosukhin
year: 2017
venue: NeurIPS 2017
doi: 10.48550/arXiv.1706.03762
url: https://arxiv.org/abs/1706.03762
paperType: conference
readStatus: studied
rating: 5
keywords:
  - transformer
  - attention mechanism
  - sequence-to-sequence
  - machine translation
concepts:
  - transformer-architecture
  - self-attention
  - multi-head-attention
---

# Attention Is All You Need

The landmark paper that introduced the Transformer architecture, revolutionizing natural language processing and later computer vision.

## Key Contributions

1. **Self-attention mechanism** - Allows the model to attend to different positions of the input sequence
2. **Multi-head attention** - Enables learning different representation subspaces
3. **Positional encoding** - Injects sequence order information without recurrence
4. **Encoder-decoder architecture** - Clean separation of concerns

## Abstract

The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.

## Impact

This paper has been cited over 100,000 times and forms the basis for:
- [[BERT]]
- [[GPT Series]]
- [[Vision Transformer]]
- Most modern large language models

## Personal Notes

Essential reading for understanding modern NLP. The clarity of the architecture diagram in Figure 1 is particularly helpful.

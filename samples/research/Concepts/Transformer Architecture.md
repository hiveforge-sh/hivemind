---
id: transformer-architecture
type: concept
status: canon
title: Transformer Architecture
tags:
  - architecture
  - deep-learning
  - nlp
name: Transformer Architecture
definition: A neural network architecture based entirely on attention mechanisms, without recurrence or convolution
domain: Machine Learning / NLP
aliases:
  - Transformer
  - Transformer Model
relatedConcepts:
  - self-attention
  - multi-head-attention
  - positional-encoding
keyPapers:
  - attention-is-all-you-need
---

# Transformer Architecture

The Transformer is a neural network architecture introduced in the paper [[Attention Is All You Need]] that relies entirely on [[Self-Attention]] mechanisms to draw global dependencies between input and output.

## Core Components

### Encoder
- Stack of identical layers
- Each layer has multi-head self-attention and feed-forward network
- Residual connections and layer normalization

### Decoder
- Similar to encoder but with masked self-attention
- Additional cross-attention layer attending to encoder output

### Key Innovations

1. **[[Self-Attention]]** - Allows each position to attend to all positions
2. **[[Multi-Head Attention]]** - Parallel attention operations in different subspaces
3. **[[Positional Encoding]]** - Sinusoidal functions to encode position information

## Advantages Over RNNs

- Parallelizable training (no sequential dependencies)
- Better at capturing long-range dependencies
- More interpretable attention patterns

## Variants

- Encoder-only: [[BERT]]
- Decoder-only: [[GPT Series]]
- Vision: [[Vision Transformer]]

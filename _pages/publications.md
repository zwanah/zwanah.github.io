---
layout: archive
title: "Publications"
permalink: /publications/
author_profile: true
---
{% include base_path %}
## [TransFlower: An Explainable Transformer-Based Model with Flow-to-Flow Attention for Commuting Flow Prediction](https://arxiv.org/abs/2402.15398)

Understanding the link between urban planning and commuting flows is crucial for guiding urban development and policymaking. This research, bridging computer science and urban studies, addresses the challenge of integrating these fields with their distinct focuses. Traditional urban studies methods, like the gravity and radiation models, often underperform in complex scenarios due to their limited handling of multiple variables and reliance on overly simplistic and unrealistic assumptions, such as spatial isotropy. While deep learning models offer improved accuracy, their black-box nature poses a trade-off between performance and explainability -- both vital for analyzing complex societal phenomena like commuting flows. To address this, we introduce TransFlower, an explainable, transformer-based model employing flow-to-flow attention to predict urban commuting patterns. It features a geospatial encoder with an anisotropy-aware relative location encoder for nuanced flow representation. Following this, the transformer-based flow predictor enhances this by leveraging attention mechanisms to efficiently capture flow interactions. Our model outperforms existing methods by up to 30.8% Common Part of Commuters, offering insights into mobility dynamics crucial for urban planning and policy decisions.

## [Medical Image Debiasing by Learning Adaptive Agreement from a Biased Council](https://arxiv.org/abs/2401.11713)

Deep learning could be prone to learning shortcuts raised by dataset bias and result in inaccurate, unreliable, and unfair models, which impedes its adoption in real-world clinical applications. Despite its significance, there is a dearth of research in the medical image classification domain to address dataset bias. Furthermore, the bias labels are often agnostic, as identifying biases can be laborious and depend on post-hoc interpretation. This paper proposes learning Adaptive Agreement from a Biased Council (Ada-ABC), a debiasing framework that does not rely on explicit bias labels to tackle dataset bias in medical images. Ada-ABC develops a biased council consisting of multiple classifiers optimized with generalized cross entropy loss to learn the dataset bias. A debiasing model is then simultaneously trained under the guidance of the biased council. Specifically, the debiasing model is required to learn adaptive agreement with the biased council by agreeing on the correctly predicted samples and disagreeing on the wrongly predicted samples by the biased council. In this way, the debiasing model could learn the target attribute on the samples without spurious correlations while also avoiding ignoring the rich information in samples with spurious correlations. We theoretically demonstrated that the debiasing model could learn the target features when the biased model successfully captures dataset bias. Moreover, to our best knowledge, we constructed the first medical debiasing benchmark from four datasets containing seven different bias scenarios. Our extensive experiments practically showed that our proposed Ada-ABC outperformed competitive approaches, verifying its effectiveness in mitigating dataset bias for medical image classification. The codes and organized benchmark datasets will be made publicly available.

<!-- 
<p float="left" align="center">
<img src="{{ site.url }}/images/publication1.png" width="400" /> 
<figcaption align="center">
Medical image classification results may be inaccurate and untrustworthy due to dataset bias. Here is a simplified schematic of an upcoming release with more detailed information to come.
</figcaption>
</p> -->

<!-- ## [Elastic Interaction-Based Retinal Image Restoration](https://zwanah.github.io/files/publication2.pdf)

It will be released soon.

<p float="left" align="center">
<img src="{{ site.url }}/images/publication2.png" width="400" /> 
<figcaption align="center">
The restoration results on Mendeley.
</figcaption>
</p> -->

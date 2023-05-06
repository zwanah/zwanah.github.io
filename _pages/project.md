---
layout: archive
title: ""
permalink: /project/
author_profile: true
---
{% include base_path %}

## [An Improvement in Baum Welch Algorithm - A Case Study of HSI future](https://zwanah.github.io/files/project1.pdf)

The Baum Welch Algorithm is widely used for training the parameters of Hidden Markov Models using EM techniques. However, the traditional BW algorithm doesn't make any distributional assumption for the observations. In this paper, we propose a Distribution Based BW algorithm and study its advantages by experiments of simulated HMM chains. We also apply this new BW algorithm on HSI futures study. The new proposed Distribution Based BW algorithm can improve the performance significantly both in experiments and real-world practice.

<p float="left" align="center">
<img src="{{ site.url }}/images/project1.png" width="700" /> 
<figcaption align="center">
Distribution Based BW versus Traditional BW Predicted Transition Matrix
</figcaption>
</p>

## [Herding model](https://zwanah.github.io/files/project2.pdf)

Herd behavior, in which many investors adopt the same trading strategy or have the same preferences for a particular asset over a certain period, is a good explanation of "bounded rationality" in the real world. This project sets out over 80 rules containing three types of investors and three types of market news to simulate herd behavior in the real-world stock market. Based on the comparison of stock price, returns time series and investor behavior chart per round, we find that Herd Behavior will begin to highlight in the period of stock price acute fluctuations. A direct comparison is made with the daily closures of the Hang Seng index. Our stock sequences exhibit properties like actual market data.

<p float="left" align="center">
<img src="{{ site.url }}/images/project2.png" width="700" /> 
<figcaption align="center">
With a two-dimensional grid of 100×100, there can be 10000 investors participating in each round.
</figcaption>
</p>
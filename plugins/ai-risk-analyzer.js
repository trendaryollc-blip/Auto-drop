// ============================================================================
// PLUGIN: AI Risk Analyzer — Win/loss probability, risk assessment
// ============================================================================
(function(){
const {PluginRegistry,Config,UI} = window.HuntDrop;

const AIRiskAnalyzer = {
  id: 'ai-risk-analyzer',
  name: 'AI Risk Analyzer',
  version: '1.0.0',

  init(ctx) {},

  mount(ctx) {},

  unmount(ctx) {},

  analyzeProduct(product) {
    if (!product) return null;
    var factors = { positive: [], negative: [], neutral: [] };

    if (product.score >= 80) {
      factors.positive.push('High AI score (' + product.score + '/100) indicates strong potential');
    } else if (product.score >= 60) {
      factors.neutral.push('Moderate AI score (' + product.score + '/100) — needs differentiation');
    } else {
      factors.negative.push('Low AI score (' + product.score + '/100) — high failure risk');
    }

    if (product.margin >= 50) {
      factors.positive.push(product.margin + '% margin provides excellent buffer for ads and returns');
    } else if (product.margin >= 30) {
      factors.neutral.push(product.margin + '% margin is sustainable but tight');
    } else {
      factors.negative.push(product.margin + '% margin leaves little room for error');
    }

    if (product.competition === 'low') {
      factors.positive.push('Low competition — easier to rank and get visibility');
    } else if (product.competition === 'medium') {
      factors.neutral.push('Medium competition — need strong marketing to stand out');
    } else {
      factors.negative.push('High competition — expensive to compete, need big budget');
    }

    var trend = this.calculateTrend(product.trendData);
    if (trend > 15) {
      factors.positive.push('Strong upward trend (+' + trend.toFixed(0) + '%) — growing demand');
    } else if (trend > 0) {
      factors.positive.push('Slight upward trend (+' + trend.toFixed(0) + '%)');
    } else if (trend > -15) {
      factors.neutral.push('Slight downward trend (' + trend.toFixed(0) + '%)');
    } else {
      factors.negative.push('Declining trend (' + trend.toFixed(0) + '%) — shrinking market');
    }

    if (product.riskScore < 30) {
      factors.positive.push('Low risk score (' + product.riskScore + ')');
    } else if (product.riskScore < 60) {
      factors.neutral.push('Moderate risk score (' + product.riskScore + ')');
    } else {
      factors.negative.push('High risk score (' + product.riskScore + ') — proceed with caution');
    }

    if (product.marketSaturation < 40) {
      factors.positive.push('Low market saturation (' + product.marketSaturation + '%) — room to grow');
    } else if (product.marketSaturation < 70) {
      factors.neutral.push('Moderate market saturation (' + product.marketSaturation + '%)');
    } else {
      factors.negative.push('High market saturation (' + product.marketSaturation + '%) — crowded market');
    }

    if (product.demand >= 80) {
      factors.positive.push('High demand score (' + product.demand + ')');
    } else if (product.demand >= 50) {
      factors.neutral.push('Moderate demand (' + product.demand + ')');
    } else {
      factors.negative.push('Low demand (' + product.demand + ')');
    }

    if (product.suppliers && product.suppliers.length > 0) {
      var verified = product.suppliers.filter(function(s) { return s.verified; });
      if (verified.length > 0) {
        factors.positive.push(verified.length + ' verified supplier(s) available');
      } else {
        factors.negative.push('No verified suppliers — quality risk');
      }
    }

    var winScore = (product.score * 0.25) + (product.margin * 0.2) + ((100 - product.riskScore) * 0.2) + (product.demand * 0.15) + (trend > 0 ? 10 : 0) + (product.competition === 'low' ? 10 : product.competition === 'medium' ? 5 : 0);
    winScore = Math.min(95, Math.max(5, Math.round(winScore)));

    return {
      product: product.title,
      winProbability: winScore,
      recommendation: winScore >= 70 ? 'PROCEED' : winScore >= 50 ? 'PROCEED WITH CAUTION' : 'RECONSIDER',
      recColor: winScore >= 70 ? 'var(--accent-green)' : winScore >= 50 ? 'var(--accent-orange)' : 'var(--accent-red)',
      factors: factors,
      profitPerUnit: this.calculateProfit(product),
      breakEvenUnits: this.calculateBreakEven(product),
      monthlyProjection: this.projectMonthly(product)
    };
  },

  analyzeDecision(options) {
    if (!options || !options.length) return [];
    var self = this;
    return options.map(function(opt) {
      var score = self.calculateOptionScore(opt);
      return {
        option: opt.name || opt.title,
        score: score,
        pros: self.getPros(opt),
        cons: self.getCons(opt),
        recommendation: score >= 70 ? 'Best Choice' : score >= 50 ? 'Viable' : 'Risky'
      };
    }).sort(function(a, b) { return b.score - a.score; });
  },

  calculateProfit(product) {
    if (!product.platformPrices || !product.platformPrices.amazon) return 0;
    var sellingPrice = product.platformPrices.amazon;
    var cost = product.price;
    var shipping = 2.50;
    var adCost = product.adSpendAvg || 3;
    return Math.round((sellingPrice - cost - shipping - adCost) * 100) / 100;
  },

  calculateBreakEven(product) {
    var profit = this.calculateProfit(product);
    if (profit <= 0) return Infinity;
    var fixedCosts = 50;
    return Math.ceil(fixedCosts / profit);
  },

  projectMonthly(product) {
    var profit = this.calculateProfit(product);
    var velocity = product.salesVelocity || 100;
    var conservative = Math.round(velocity * 0.5);
    var moderate = Math.round(velocity * 1);
    var aggressive = Math.round(velocity * 2);
    return {
      conservative: { units: conservative, profit: Math.round(conservative * profit) },
      moderate: { units: moderate, profit: Math.round(moderate * profit) },
      aggressive: { units: aggressive, profit: Math.round(aggressive * profit) }
    };
  },

  calculateTrend(trendData) {
    if (!trendData || trendData.length < 6) return 0;
    var recent = trendData.slice(-3).reduce(function(a, b) { return a + b; }, 0) / 3;
    var early = trendData.slice(0, 3).reduce(function(a, b) { return a + b; }, 0) / 3;
    if (early === 0) return 0;
    return ((recent - early) / early) * 100;
  },

  calculateOptionScore(opt) {
    var score = 50;
    if (opt.score) score += (opt.score - 50) * 0.3;
    if (opt.margin) score += (opt.margin - 30) * 0.2;
    if (opt.riskScore !== undefined) score -= (opt.riskScore - 30) * 0.2;
    if (opt.competition === 'low') score += 10;
    else if (opt.competition === 'high') score -= 10;
    return Math.min(95, Math.max(5, Math.round(score)));
  },

  getPros(opt) {
    var pros = [];
    if (opt.score >= 75) pros.push('High score (' + opt.score + ')');
    if (opt.margin >= 40) pros.push('Good margin (' + opt.margin + '%)');
    if (opt.competition === 'low') pros.push('Low competition');
    if (opt.riskScore < 40) pros.push('Low risk');
    if (opt.demand >= 70) pros.push('High demand');
    return pros;
  },

  getCons(opt) {
    var cons = [];
    if (opt.score < 60) cons.push('Low score (' + opt.score + ')');
    if (opt.margin < 25) cons.push('Thin margin (' + opt.margin + '%)');
    if (opt.competition === 'high') cons.push('High competition');
    if (opt.riskScore > 60) cons.push('High risk');
    if (opt.demand < 40) cons.push('Low demand');
    return cons;
  },

  formatAnalysisForAI(analysis) {
    if (!analysis) return 'No analysis available.';
    var output = '';
    output += 'WIN PROBABILITY: ' + analysis.winProbability + '%\n';
    output += 'RECOMMENDATION: ' + analysis.recommendation + '\n\n';
    output += 'PROFIT PER UNIT: $' + analysis.profitPerUnit + '\n';
    output += 'BREAK-EVEN: ' + analysis.breakEvenUnits + ' units\n\n';
    output += 'MONTHLY PROJECTIONS:\n';
    output += '  Conservative: ' + analysis.monthlyProjection.conservative.units + ' units = $' + analysis.monthlyProjection.conservative.profit + '\n';
    output += '  Moderate: ' + analysis.monthlyProjection.moderate.units + ' units = $' + analysis.monthlyProjection.moderate.profit + '\n';
    output += '  Aggressive: ' + analysis.monthlyProjection.aggressive.units + ' units = $' + analysis.monthlyProjection.aggressive.profit + '\n\n';
    output += 'POSITIVE FACTORS:\n';
    analysis.factors.positive.forEach(function(f) { output += '  + ' + f + '\n'; });
    output += '\nNEGATIVE FACTORS:\n';
    analysis.factors.negative.forEach(function(f) { output += '  - ' + f + '\n'; });
    if (analysis.factors.neutral.length > 0) {
      output += '\nNEUTRAL FACTORS:\n';
      analysis.factors.neutral.forEach(function(f) { output += '  ~ ' + f + '\n'; });
    }
    return output;
  }
};

window.HuntDrop.AIRiskAnalyzer = AIRiskAnalyzer;
PluginRegistry.register('ai-risk-analyzer', AIRiskAnalyzer);
})();

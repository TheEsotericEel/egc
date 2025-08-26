"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gross = gross;
exports.fees = fees;
exports.net = net;
function gross(itemPrice, shippingCharged) {
    return itemPrice + shippingCharged;
}
function fees(gross, feeRate) {
    return gross * feeRate;
}
function net(itemPrice, shippingCharged, shippingCost, cogs, feeRate) {
    var g = gross(itemPrice, shippingCharged);
    var f = fees(g, feeRate);
    return g - (shippingCost + cogs + f);
}

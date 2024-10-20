// middleware/auth.js
const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const token = req.headers["Authorization"].split(" ")[1];

    if (!token) {
        return res.status(403).send("No token provided");
    }

    try {
        const decoded = jwt.verify(token, process.env.TOKEN_KEY);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).send("Invalid Token");
    }
}

module.exports = verifyToken;

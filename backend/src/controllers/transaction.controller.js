// import transactionService from "../services/transaction.service.js";

// const createTransaction = async (req, res, next) => {
//   try {
//     const result = await transactionService.processTransaction(req.body);

//     return res.status(201).json({
//       success: true,
//       message: "Transaction processed successfully",
//       data: result,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// export default {
//   createTransaction,
// };
import transactionService from "../services/transaction.service.js";

const createTransaction = async (req, res, next) => {
  try {
    const result = await transactionService.processTransaction(req.body);

    return res.status(201).json({
      success: true,
      message: "Transaction processed successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  createTransaction,
};
// import { DataTypes } from 'sequelize';
// import sequelize from '../db/sequelize';

// const RawRfMessage = sequelize.define(
//   'RawRfMessage',
//   {
//     id: {
//       type: DataTypes.INTEGER,
//       primaryKey: true,
//       autoIncrement: true,
//     },

//     collarId: {
//       type: DataTypes.INTEGER,
//       allowNull: false,
//     },

//     latitude: {
//       type: DataTypes.DECIMAL(10, 7),
//       allowNull: false,
//     },

//     longitude: {
//       type: DataTypes.DECIMAL(10, 7),
//       allowNull: false,
//     },

//     recordedAt: {
//       type: DataTypes.DATE,
//       allowNull: false,
//       comment: 'real timestamp from GPS',
//     },

//     speed: {
//       type: DataTypes.FLOAT,
//       allowNull: true,
//     },

//     altitude: {
//       type: DataTypes.FLOAT,
//       allowNull: true,
//     },

//     satellitesCount: {
//       type: DataTypes.INTEGER,
//       allowNull: true,
//     },

//     hdop: {
//       type: DataTypes.DOUBLE,
//       allowNull: true,
//     },

//     rssi: {
//       type: DataTypes.DOUBLE,
//       allowNull: true,
//     },

//     snr: {
//       type: DataTypes.DOUBLE,
//       allowNull: true,
//     },

//     voltage: {
//       type: DataTypes.DOUBLE,
//       allowNull: true,
//     },

//     crc: {
//       type: DataTypes.STRING,
//       allowNull: true,
//     },

//     invalidReasonId: {
//       type: DataTypes.INTEGER,
//       allowNull: true,
//     },

//     processedAt: {
//       type: DataTypes.DATE,
//       allowNull: true,
//     },
//   },
//   {
//     // tableName: 'raw_rf_messages',
//     underscored: true,
//     timestamps: true,
//   },
// );

// export default RawRfMessage;

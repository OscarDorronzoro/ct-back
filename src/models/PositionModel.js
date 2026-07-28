// import { DataTypes } from 'sequelize';
// import sequelize from '../sequelize';

// const Position = sequelize.define(
//   'Position',
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

//     accuracy: {
//       type: DataTypes.DOUBLE,
//       allowNull: true,
//     },

//     signalStrength: {
//       type: DataTypes.DOUBLE,
//       allowNull: true,
//     },

//     speed: {
//       type: DataTypes.FLOAT,
//       allowNull: true,
//     },

//     distanceToPrevious: {
//       type: DataTypes.FLOAT,
//       allowNull: true,
//     },

//     cowId: {
//       type: DataTypes.INTEGER,
//       allowNull: false,
//     },

//     rawRfMessageId: {
//       type: DataTypes.INTEGER,
//       allowNull: false,
//     },

//     zoneId: {
//       type: DataTypes.INTEGER,
//       allowNull: true,
//     },
//   },
//   {
//     underscored: true,
//     timestamps: true,
//   },
// );

// export default Position;

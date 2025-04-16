import SellerStatus from './SellerStatus';

{item.owner && (
  <div className="item-seller">
    <div className="seller-avatar">
      <img 
        src={item.owner.avatar || '/default-avatar.png'} 
        alt={item.owner.displayName || 'Seller'} 
        onError={(e) => {
          e.target.src = '/default-avatar.png';
        }}
      />
    </div>
    <div className="seller-info">
      <div className="seller-name">{item.owner.displayName || 'Unknown Seller'}</div>
      {item.owner._id && (
        <SellerStatus 
          sellerId={item.owner._id} 
          forceStatus={item.owner.isOnline}
          showLastSeen={true} 
        />
      )}
    </div>
  </div>
)} 
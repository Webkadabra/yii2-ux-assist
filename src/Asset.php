<?php
/**
 * Alphatech, <http://www.alphatech.com.ua>
 *
 * Copyright (C) 2015-present Sergii Gamaiunov <hello@webkadabra.com>
 * All rights reserved.
 */

namespace webkadabra\uxassist;

use yii\web\AssetBundle;

class Asset extends AssetBundle
{
    public $sourcePath = '@vendor/webkadabra/uxassist/assets';
    
    public $js = [
        'js/alpha.js',
    ];
    
    public $depends = [
        'yii\jquery\magnificpopup\MagnificPopupAsset',
        'yii\bootstrap\BootstrapAsset',
    ];
	
	public $autorun = true;

    /**
     * Registers this asset bundle with a view.
     * @param View $view the view to be registered with
     * @return static the registered asset bundle instance
     */
    public static function register($view)
    {
        if ($this->autorun == true)
			$view->registerJs('alpha.ux.init();');
        return parent::register($view);
    }
}

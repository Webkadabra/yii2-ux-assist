<?php
namespace webkadabra\uxassist;

use yii;
use yii\base\Component;
use yii\base\Event;
use yii\data\Pagination;
use yii\helpers\Html;
use yii\httpclient\Exception;

/**
 * Helper to return responses compatibl with client scripts from `alphaclient/src/js/alpha.js`
 * Example:
 * ``` AlphaClientResponse::create()->setSuccessStatus()->setMessage('Yo!')->serve(); ```
 * 
 * @author Sergii Gamaiunov <hello@webkadabra.com>
 */
class AlphaClientResponse extends Component implements \JsonSerializable
{
    const TYPE_SUCCESS = 'success';
    const TYPE_ERROR = 'error';

    protected $_responseType;
    protected $_responseMessage;

    protected $_response=array();

//    protected
    /**
     * @return AlphaClientResponse
     */
    public static function create($forceJSONResponse = false) {
        if ($forceJSONResponse == true) {
            Yii::$app->response->format = yii\web\Response::FORMAT_JSON;
        }
        return new self();
    }

    public function jsonSerialize() {
        return $this->_response;
    }

    /**
     * @return AlphaClientResponse
     */
    public function setRedirect($value, $timeout=null) {
        $this->_response['forwardUrl'] = $value;
        if($timeout) {
            $this->_response['forwardTimeout'] = $timeout;
        }
        return $this;
    }
    /**
     * @return AlphaClientResponse
     */
    public function setMessage($value) {
        $this->_response['msg'] = $value;
        return $this;
    }
    /**
     * @return string
     */
    public function getMessage() {
        return $this->_response['msg'];
    }

    /**
     * allows to redefine default message fading options useful, if you need to make some message
     * stick on client side until user closes it manually (e.g. server returns inline form)
     *
     * @param bool $fade
     * @param int $delay
     * @return $this
     */
    public function setMessageFadingOptions($fade=true, $delay=5000) {
        if($delay && $delay < 1000) {
            // then it's in seconds
            $delay = $delay*1000;
        }
        $this->_response['msgOptions'] = array(
            'enabled'=>$fade,
            'delay'=>$delay,
        );
        return $this;
    }

    /**
     * @return AlphaClientResponse
     */
    public function setClearMessages() {
        $this->_response['clearMessages'] = true;
        return $this;
    }

    /**
     * @return AlphaClientResponse
     */
    public function setSuccessStatus() {
        $this->_response['type'] = self::TYPE_SUCCESS;
        return $this;
    }

    /**
     * @return AlphaClientResponse
     */
    public function setErrorStatus() {
        $this->_response['type'] = self::TYPE_ERROR;
        return $this;
    }

    /**
     * @return AlphaClientResponse
     */
    public function setCloseModal() {
        $this->_response['dismiss'] = true;
        return $this;
    }

    /**
     * @return AlphaClientResponse
     */
    public function setUpdateGrids($value) {
        $values = isset($this->_response['updateViews']) ? explode('|',$this->_response['updateViews']) : array();

        if(!is_array($value))
            $value = array($value);

        foreach($value as $v) {
            $values[] = 'g:'.$v;
        }

        $this->_response['updateViews'] = implode('|',$values);

        return $this;
    }
    /**
     * @return AlphaClientResponse
     */
    public function setUpdateViews($value) {
        $this->_response['updateViews'] = (is_array($value) ? implode('|',$value) : $value);
        return $this;
    }
    /**
     * @return AlphaClientResponse
     */
    public function setUpdateValues($value) {
        $this->_response['updateValues'] = $value;
        return $this;
    }

    /**
     * @param Pagination|null $pagination
     * @return $this
     */
    public function setRepeatRequest($pagination=null)
    {
        $this->_response['repeatRequest'] = true;
        if($pagination) {
            $page = $pagination->currentPage;
            $page++;
            $this->_response['requestNextStep']=$page;
        }
        return $this;
    }

    /**
     * @param int $timeout seconds before client page is refreshed
     * @return $this
     */
    public function setRefreshClientPage($timeout=1)
    {
        $this->_response['refreshPage'] = $timeout;
        return $this;
    }
    const PASS_ITEM_ID_KEY = 'item_id';
    public function setItemId($id) {
        $this->_response[self::PASS_ITEM_ID_KEY] = $id;
        return $this;
    }
    public function getItemId() {
        return isset($this->_response[self::PASS_ITEM_ID_KEY]) ? $this->_response[self::PASS_ITEM_ID_KEY] : null;
    }
    public function setData($data) {
        foreach($data as $key => $values)
            $this->_response[$key]=$values;
        return $this;
    }
    public function getData($key) {
        return isset($this->_response[$key]) ? $this->_response[$key] : null;
    }
    public function getResponse() {
        return $this->_response;
    }
    public function serve($exit=true, $respectRequestType=false)
    {
        $this->raiseEvents();
        if($respectRequestType) {
            if(Yii::$app->getRequest()->isAjaxRequest) {
                echo json_encode($this->_response);
                if($exit) {
                    Yii::$app->end();
                }
            } else {
                // we need this for cases, when user's browser may have had some javascript errors:
                if(isset($this->_response['msg']) && $this->_response['msg']) {
                    Yii::$app->user->setFlash(
                        (isset($this->_response['type']) ? $this->_response['type'] : 'success'),
                        $this->_response['msg']);

                    if(isset($this->_response['forwardUrl'])) {
                        Yii::$app->getRequest()->redirect($this->_response['forwardUrl']);
                    } else {
                        Yii::$app->getRequest()->redirect(Yii::$app->user->returnUrl);
                    }
                }
            }
        } else {
            echo json_encode($this->_response);
            if($exit) {
                Yii::$app->end();
            }
        }
    }

    /**
     * @param int $code
     *
     * @throws Exception
     */
    public function throwError($code=400) {
        throw new Exception($code, $this->_response['msg']);
    }

    public function getIsSuccess() {
        return $this->_response['type'] === self::TYPE_SUCCESS;
    }

    protected function raiseEvents() {
        if($this->hasEventHandlers('onReturnResponse')){
            $event = new Event($this);
            $this->onReturnResponse($event);
        }
    }
    public function onReturnResponse($event) {
        $this->trigger('onReturnResponse', $event);
    }

    public function errors($model) {
        $this->setErrorStatus();
        $this->setMessage(Html::errorSummary($model));
        return $this;
    }
}